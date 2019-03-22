"use strict";

const { readdirSync, statSync } = require('fs')
var path = require("path");
var Sequelize = require("sequelize");
let sequelize = new Sequelize(process.env.PSQL_URI, {
    dialect: 'postgres',
    operatorsAliases: false,
    logging: false,
    define: {
        freezeTableName: true,
        charset: 'utf8',
        dialectOptions: {
          collate: 'utf8_general_ci'
        },
        timestamps: true,
        updatedAt: 'updated_at',
        createdAt: 'created_at'
    }
});

var db = {};
function getDirectories(path) {
    return readdirSync(path).filter(function (file) {
      return statSync(path+'/'+file).isDirectory();
    });
}
getDirectories(__dirname).forEach(function(dir) {
    dir = __dirname + "/" + dir;
    readdirSync(dir).forEach(function(file) {
        var model = sequelize.import(path.join(dir, file));
        db[model.name] = model;
    });
})

Object.keys(db).forEach(function(modelName) {
  if ("associate" in db[modelName]) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;
module.exports = db;