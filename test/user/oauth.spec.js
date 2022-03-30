const { expect } = require('chai');
const sinon = require('sinon');
const Fastify = require('fastify')
const fp = require('fastify-plugin')
const mongoose = require('mongoose')
const App = require('../../app')

describe('oauth plugin', function () {

    describe('authorize_boss_admin()', function () {

        this.timeout(40000);

        let instance;
        let fakeNext;
        let stubDecorator_On;

        beforeEach(function (done) {

            instance = Fastify()
            instance.ready(done);
            instance.register(fp(App), {})

            instance.post('/', (request, reply) => {

                // stub 'on' decorator
                stubDecorator_On = sinon.stub(instance, 'on').yields(null, null);

                instance.authorize_boss_admin(request, reply, user => {
                    if (fakeNext) {
                        fakeNext(user);
                    }
                    reply.send(user);
                });

            });

        });

        afterEach(function () {
            Object.keys(mongoose.connection.models).forEach(modelName => {
                delete mongoose.connection.models[modelName];
            });

            fakeNext = null;
            instance.close();
            sinon.restore();
        });

        it('Accept-User=QRCode should stop authorization process with null user value', (done) => {
            fakeNext = function (user) {
                expect(user).to.be.null;
            }
            instance.inject({
                method: 'POST',
                url: '/',
                headers: {
                    'accept-user': 'QRCode',
                }
            }, (err, response) => {
                expect(response.statusCode).to.be.eql(200);
                expect(response.statusMessage).to.be.eql('OK');
                done();
            });
        });

        it('Without authorization header it should return 401-Unauthorized', (done) => {
            instance.inject({
                method: 'POST',
                url: '/',
            }, (err, response) => {
                expect(response.statusCode).to.be.eql(401);
                expect(response.statusMessage).to.be.eql('Unauthorized');
                done();
            });
        });

        it('With authorization header it should try to find a user', (done) => {
            const expectedUser = {};
            const findOne = sinon.stub(mongoose.connection.models.User, 'findOne').yields(null, expectedUser);

            instance.inject({
                method: 'POST',
                url: '/',
                headers: {
                    authorization: 'abc'
                }
            }, (err, response) => {
                expect(findOne.calledOnce).to.be.true;
                done();
            });
        });

        it('If boss/admin user will be found, it should return it', (done) => {
            fakeNext = function (user) {
                expect(user.name).to.be.eql('John');
            }

            const expectedUser = { name: 'John' };
            sinon.stub(mongoose.connection.models.User, 'findOne').yields(null, expectedUser);

            instance.inject({
                method: 'POST',
                url: '/',
                headers: {
                    authorization: 'abc'
                }
            }, (err, response) => {
                done();
            });
        });

        it('If boss/admin user will not be found, it should initiate ordinary authorization', (done) => {
            const expectedUser = null;
            sinon.stub(mongoose.connection.models.User, 'findOne').yields(null, expectedUser);

            instance.inject({
                method: 'POST',
                url: '/',
                headers: {
                    authorization: 'abc'
                }
            }, (err, response) => {
                expect(stubDecorator_On.called).to.be.true;
                done();
            });
        });

    });

});
