const assert = require('assert');
const chai = require('chai')
const chaiHttp = require('chai-http');
chai.use(chaiHttp);
const server = require('../app').server;
const should = chai.should();
const jwt = require('jsonwebtoken');
const { User } = require('../models/index.js');
const moment = require('moment');

try {

/*
* Place holder to make sure tests are running on jenkins
*/
describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1, 2, 3].indexOf(4), -1);
    });
  });
});


describe('Login with email and password', () => {
    before(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            return User.query().insert({
                firstName: "John",
                lastName: "Doe",
                email: 'test@test.com', 
                password: "$2b$10$IDmDD/VYelBhCsmBj2vALu6j7W7KuDsYcTL/58yyEkQKOFhM2m3.u" 
            });
        }).then(() => {
            done();
        }).catch(err => {
            console.log(err);
            done(err);
        });
    });

    it('It should return a JWT on login', function(done) {
        let account = {
            email: "test@test.com",
            password: "password1234",
        }
        chai.request(server)
            .post('/auth/login')
            .send(account)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.have.property('error');
                res.body.error.should.eql(false);
                res.body.data.token.should.be.a('string');
                done();
        });
    });

    after(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });
    
});


describe('Signup with email and password', () => {

    before(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('It should return a JWT on signup', function(done) {
        let account = {
            firstName: "John",
            lastName: "Doe",
            email: "test@test.com",
            password: "Pa5word13!",
        }
        chai.request(server)
            .post('/auth/register')
            .send(account)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.have.property('error');
                res.body.error.should.eql(false);
                res.body.data.token.should.be.a('string');
                done();
        });
    });

    after(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

});

describe('Protected endpoints should not be accessed without a valid JWT', () => {

    it('It should return an unauthorized error', function(done) {
        chai.request(server)
            .get('/auth/secret')
            .end(function (err, res) {
                res.should.have.status(401);
                done();
        });
    });

    after(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

});

describe('Popular destinations', () => {
    it('It should return four cities and a link to download picture.', function(done) {
        chai.request(server)
            .get('/popularDestinations')
            .end(function (err, res) {
                res.should.have.status(200);
                done();
        });
    });
}); 

describe('Get user details', () => {
    token = ""
    before(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            return User.query().insert({
                firstName: "John",
                lastName: "Doe",
                email: 'test@test.com', 
                password: "$2b$10$IDmDD/VYelBhCsmBj2vALu6j7W7KuDsYcTL/58yyEkQKOFhM2m3.u" 
            });
        }).then(() => {
            var payload = { email: 'test@test.com' };
            token = jwt.sign(payload, global.jwtOptions.secretOrKey)
            done();
        }).catch(err => {
            console.log(err);
            done(err);
        });
    });
    it('It should return the users details', function(done) {
        chai.request(server)
            .get('/auth/userDetails')
            .set('Authorization', 'Bearer ' + token)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.data.firstName.should.eql('John');
                res.body.data.lastName.should.eql('Doe');
                done();
        });
    });

}); 

describe('Hotels', () => {
    let startDate = moment().add(1, 'days').format("YYYY-MM-DD");
    let endDate = moment().add(2, 'days').format("YYYY-MM-DD");
    var payload = { email: 'test@test.com' };
    token = jwt.sign(payload, global.jwtOptions.secretOrKey)
    it('It should return the hotel\'s details', function(done) {
        chai.request(server)
            .get('/hotels/1?startDate=' + startDate + '&endDate=' + endDate)
            .set('Authorization', 'Bearer ' + token)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.data.should.not.eql(undefined);
                done();
        });
    });
    it('It should return matching hotels', function(done) {
        chai.request(server)
            .get('/hotels?latitude=37.3440232&longitude=-121.8738311&startDate=' + startDate + '&endDate=' + endDate + '&persons=1')
            .set('Authorization', 'Bearer ' + token)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.data.should.not.eql(undefined);
                done();
        });
    });
}); 

describe('Adding and removing payment methods', () => {
    token = ""
    before(async () => {
        await User.query().delete().where('email', '=', 'test@test.com')
        let body = {
            "firstName": "Test",
            "lastName": "McTester",
            "email": "test@test.com",
            "password": "T3sta00ni"
        }
        let res = await chai.request(server).post('/auth/register').send(body);
        token = res.body.data.token;
    });
    it('It should add a source to the user', function(done) {
        let body = {
            token: "tok_1EPjaRJJU2YEsvxmq737EJzT"
        }
        chai.request(server)
            .post('/users/paymentMethods')
            .set('Authorization', 'Bearer ' + token)
            .send(body)
            .end(function (err, res) {
                res.should.have.status(200);
                done();
        });
    });

    it('It should return the users sources', function(done) {
        chai.request(server)
            .get('/users/paymentMethods')
            .set('Authorization', 'Bearer ' + token)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.data.sources.should.not.eql(undefined);
                done();
        });
    });

    after(function(done) {
        User.query().delete().where('email', '=', 'test@test.com').then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

}); 

after(function(done) {
    server.close();
    done();
});

} catch(e) {
    console.log(e);
    server.close();
}