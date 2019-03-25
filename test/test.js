var assert = require('assert');
var chai = require('chai')
var chaiHttp = require('chai-http');
chai.use(chaiHttp);
let server = require('../app');
let should = chai.should();
require('../models/index.js').User;


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
        User.destroy({ where: { email: 'test@test.com' }}).then(() => {
            return User.create({ 
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

    it('It should return a JWT on login', () => {
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
        });
    });

    after(function(done) {
        User.destroy({ where: { email: 'test@test.com' }}).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });
    
});


describe('Signup with email and password', () => {

    before(function(done) {
        User.destroy({where: { email: 'test@test.com' }}).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

    it('It should return a JWT on signup', () => {
        let account = {
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
        });
    });

    after(function(done) {
        User.destroy({ where: { email: 'test@test.com' }}).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

});

describe('Protected endpoints should not be accessed without a valid JWT', () => {

    it('It should return an unauthorized error', () => {
        chai.request(server)
            .get('/auth/secret')
            .end(function (err, res) {
                res.should.have.status(401);
        });
    });

    after(function(done) {
        User.destroy({ where: { email: 'test@test.com' }}).then(() => {
            done();
        }).catch(err => {
            done(err);
        });
    });

});

describe('Popular destinations', () => {
    it('It should return four cities and a link to download picture.', () => {
        chai.request(server)
            .get('/popular-destinations')
            .end(function (err, res) {
                res.should.have.status(200);
        });
    });
}); 

describe('Reset password', () => {
    before(function(done) {
        User.destroy({ where: { email: 'test@test.com' }}).then(() => {
            return User.create({ 
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
    token = ""
    it('It should return a password reset token', async () => {
        await chai.request(server)
            .get('/forgot_password')
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.have.property('token');
        });
    });
    it('It should verify the password reset token', async () => {
        await chai.request(server)
            .get('/reset_password/' + token)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.should.have.property('token');
        });
    });

    it('It should verify the password reset token', async () => {
        let data = {
            email: "test@teset.com",
            password: "Pa5word14!",
            confirmed_password: "Pa5word14!",
            token: token
        }
        await chai.request(server)
            .put('/reset_password')
            .send(data)
            .end(function (err, res) {
                res.should.have.status(200);
                res.body.error.should.eql(false);
        });
    });
}); 