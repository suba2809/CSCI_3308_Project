const server = require('../index');


const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);
const { assert, expect } = chai;


const bcrypt = require('bcryptjs');
const { Pool } = require('pg');


const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  user: process.env.POSTGRES_USER || 'myuser',
  password: process.env.POSTGRES_PASSWORD || 'mypassword',
  database: process.env.POSTGRES_DB || 'mydatabase',
});


describe('Server!', () => {
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });


  it('should register a user with valid username and password', done => {
    chai.request(server)
      .post('/api/register')
      .send({
        first_name: 'Random',
        last_name: 'John',
        email: 'john@random.com',
        username: 'JohnDoe',
        password: 'DoeJohn'
      })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body.message).to.equal('Success');
        done();
      });
  });


  it('should return 400 if invalid input is provided', done => {
    chai.request(server)
      .post('/api/register')
      .send({ username: '', password: '' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.error).to.equal('All fields are required');
        done();
      });
  });
});




describe('Profile Route Tests', () => {
  let agent;
  const testUser = {
    first_name: 'Test',
    last_name: 'User',
    email: 'testuser@example.com',
    username: 'testuser',
    password: 'testpass123',
  };


  before(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await pool.query(
      'INSERT INTO users (first_name, last_name, email, username, password) VALUES ($1, $2, $3, $4, $5)',
      [
        testUser.first_name,
        testUser.last_name,
        testUser.email,
        testUser.username,
        hashedPassword,
      ]
    );
  });


  beforeEach(() => {
    agent = chai.request.agent(server);
  });


  afterEach(() => {
    agent.close();
  });


  after(async () => {
    await pool.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  });


  it('should return 401 if user is not authenticated', done => {
    chai
      .request(server)
      .get('/api/profile')
      .end((err, res) => {
        expect(res).to.have.status(401);
        expect(res.text).to.equal('Not authenticated');
        done();
      });
  });


  it('should return user profile when authenticated', done => {
    agent
      .post('/api/login')
      .send({ username: testUser.username, password: testUser.password })
      .end((err, res) => {
        expect(res).to.have.status(200);


        agent.get('/api/profile').end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('username', testUser.username);
          done();
        });
      });
  });
});
