const { getAllLaunches, addNewLaunch, existsLaunchWithId, abortLaunchById } = require('../../models/launches.model');

const { getPagination } = require('../../services/query');

async function httpGetAllLaunches(req, res) {
    const { skip, limit } = getPagination(req.query);
    const launches = await getAllLaunches(skip, limit);
    return res.status(200).json(launches);
}

async function httpAddNewLaunch(req, res) {

    const launch = req.body;

    if (!launch.mission || !launch.rocket || !launch.launchDate || !launch.destination) {
        return res.status(400).json({
            message: 'Missing required launch property'
        });
    }

    launch.launchDate = new Date(launch.launchDate);
    if (isNaN(launch.launchDate)) {
        return res.status(400).json({
            message: 'Invalid Launch Date'
        });
    }

    const newLaunch = await addNewLaunch(launch);
    if (!newLaunch) {
        return res.status(400).json({
            error: 'Planet not found'
        });
    }

    return res.status(201).json(launch);
}

async function httpAbortLaunch(req, res) {
    const launchId = Number(req.params.id);

    if (!launchId) {
        return res.status(400).json({
            message: 'Invalid Launch Id'
        });
    }

    const existLaunch = await existsLaunchWithId(launchId);
    if (!existLaunch) {
        return res.status(400).json({
            message: 'Launch does not exist.'
        });
    }

    const aborted = await abortLaunchById(launchId);

    if (!aborted) {
        return res.status(400).json({
            error: 'Failed to abort launch.'
        });
    }

    return res.status(200).json({
        ok: true
    });
}

module.exports = {
    httpGetAllLaunches,
    httpAddNewLaunch,
    httpAbortLaunch
};