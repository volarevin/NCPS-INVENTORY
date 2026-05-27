require('dotenv').config({ path: '../.env' });
const db = require('../config/db');
const adminController = require('../controllers/adminController');

const req = {
  query: {
    startDate: '2025-01-01',
    endDate: '2025-12-31'
  }
};

const res = {
  status: (code) => ({
    json: (data) => console.log('ERROR JSON:', parseInt(code), data)
  }),
  json: (data) => {
    console.log('SUCCESS!');
    console.log(data);
    db.end();
  }
};

adminController.getReportsData(req, res);