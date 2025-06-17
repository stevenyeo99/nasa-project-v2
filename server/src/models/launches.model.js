const axios = require('axios');

const launches = require('./launches.mongo');
const planets = require('./planets.mongo');

const DEFAULT_FLIGHT_NUMBER = 100;

const SPACEX_API_URL = 'https://api.spacexdata.com/v4/launches/query';

async function populateLaunches() {
    console.log('Downloading Launches Data...');
    const response = await axios.post(SPACEX_API_URL, {
        query: {},
        options: {
            limit: 999,
            populate: [
                {
                    path: 'rocket',
                    select: {
                        name: 1
                    }
                },
                {
                    path: 'payloads',
                    select: {
                        customers: 1
                    }
                }
            ]
        }
    });

    if (response.status !== 200) {
        console.log('Problem downloading launch data');
        throw new Error('Launch data download failed');
    }

    const launchDocs = response.data.docs;
    for (const launchDoc of launchDocs) {
        const payloads = launchDoc['payloads'];
        const customers = payloads.flatMap((payload) => {
            return payload['customers'];
        });

        const launch = {
            flightNumber: launchDoc['flight_number'],
            mission: launchDoc['name'],
            rocket: launchDoc['rocket']['name'],
            launchDate: launchDoc['date_local'],
            customers,
            upcoming: launchDoc['upcoming'],
            success: launchDoc['success']
        };

        console.log(`${launch.flightNumber} ${launch.mission}`);

        await saveLaunch(launch);
    }
}

async function loadLaunchesData() {
    const firstLaunch = await findLaunch({flightNumber: 1, rocket: 'Falcon 1', mission: 'FalconSat'});

    if (firstLaunch) {
        console.log('Launch Data already loaded');
    } else {
        await populateLaunches();
    }
}

async function getAllLaunches(skip, limit) {
    return await launches.find({}, {
        _id: 0,
        __v: 0
    })
    .sort({ flightNumber: 1 })
    .skip(skip)
    .limit(limit);
}

async function getLatestFlightNumber() {
    const latestLaunch = await launches.findOne({}).sort('-flightNumber');

    if (!latestLaunch) {
        return DEFAULT_FLIGHT_NUMBER;
    }

    return latestLaunch.flightNumber;
}

async function saveLaunch(launch) {
    await launches.findOneAndUpdate(
        {
            flightNumber: launch.flightNumber
        },
        launch,
        {
            upsert: true
        }
    );
}

async function addNewLaunch(launch) {
    const planet = await planets.findOne({
        keplerName: launch.destination
    });

    if (!planet) {
        throw new Error('No matching planet found');
    }

    const newFlightNumber = await getLatestFlightNumber() + 1;

    const newLaunch = Object.assign(launch, {
        success: true,
        upcoming: true,
        customers: ['Zero to Mastery', 'NASA'],
        flightNumber: newFlightNumber
    });

    try {
        await saveLaunch(newLaunch);
        return 1;
    } catch (error) {
        return null;
    }
}

async function findLaunch(filter) {
    return await launches.findOne(filter);
}

async function existsLaunchWithId(id) {
    const existingLaunch = await launches.findOne({ flightNumber: id });
    return existingLaunch;
}

async function abortLaunchById(launchId) {
    const aborted = await launches.updateOne(
        {
            flightNumber: launchId
        },
        {
            success: false,
            upcoming: false
        }
    );

    return aborted.modifiedCount === 1;
}

module.exports = {
    loadLaunchesData,
    launches,
    getAllLaunches,
    addNewLaunch,
    existsLaunchWithId,
    abortLaunchById
};