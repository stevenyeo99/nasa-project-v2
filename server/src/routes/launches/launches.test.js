const request = require('supertest');
const app = require('../../app');
const { mongoConnect, mongoDisconnect } = require('../../services/mongo');
const { loadPlanetsData } = require('../../models/planets.model');

describe('Launches API', () => {
    beforeAll(async () => {
        await mongoConnect();
        await loadPlanetsData();
    });

    afterAll(async() => {
        await mongoDisconnect();
    });

    describe('Test GET /launches', () => {
        test('It should respond with 200 success', async () => {
            await request(app)
                .get('/v1/launches')
                .expect('Content-Type', /json/)
                .expect(200);
        });
    });

    describe('Test POST /launches', () => {

        const completeLaunchData = {
            mission: 'Survive',
            rocket: 'Steven Rocket',
            launchDate: '2025-01-30T00:00:00Z',
            destination: 'Kepler-442 b'
        };

        const launchDataWithoutDate = {
            mission: 'Survive',
            rocket: 'Steven Rocket',
            destination: 'Kepler-442 b'
        };

        const launchDataWithInvalidDate = {
            mission: 'Survive',
            rocket: 'Steven Rocket',
            launchDate: 'test',
            destination: 'Sun'
        };

        test('It should respond with 201 success', async () => {
            const response = await request(app)
                .post('/v1/launches')
                .send(completeLaunchData)
                .expect('Content-Type', /json/)
                .expect(201);

            const responseDate = new Date(response?.body?.launchDate)?.valueOf();
            const requestDate = new Date(completeLaunchData?.launchDate)?.valueOf();
            
            expect(responseDate).toEqual(requestDate);
            
            const { mission, rocket, destination } = response?.body;
            expect({ mission, rocket, destination }).toStrictEqual(launchDataWithoutDate);
        });

        test('It should catch missing required property', async () => {
            const response = await request(app)
                .post('/v1/launches')
                .send(launchDataWithoutDate)
                .expect('Content-Type', /json/)
                .expect(400);
            
            expect(response?.body).toStrictEqual({
                message: 'Missing required launch property'
            });
        });

        test('It should catch invalid dates', async () => {
            const response = await request(app)
                .post('/v1/launches')
                .send(launchDataWithInvalidDate)
                .expect('Content-Type', /json/)
                .expect(400);
            
            expect(response?.body).toStrictEqual({
                message: 'Invalid Launch Date'
            });
        });
    });
});