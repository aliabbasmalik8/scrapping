require('dotenv').config()
const cheerio = require("cheerio");
const rp = require('request-promise');
const mysql = require('mysql');
const CronJob = require('cron').CronJob;
const url = 'https://news.ycombinator.com/jobs?next=';
const table = process.env.DB_TABLE;
let moreLink = '';

//set db configuration
var con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE
});

con.connect(function(err) {
    if (err) throw err;
    var sql = `CREATE TABLE IF NOT EXISTS ${table} (id INT, adfor VARCHAR(1000), sitename VARCHAR(1000) ,address VARCHAR(255))`;
    con.query(sql, function (err, result) {
      if (err) throw err;
    });
});

function findById(id){
    let query =  `SELECT * FROM ${table}  WHERE id = ${id}`;
    return new Promise(function(resolve, reject){
        con.query(query, (err, result) => {
            if(err) reject(err);
            resolve(result);
        })
    })
}

function addInTable(row){
    let query = `INSERT INTO ${table}  (id, adfor, sitename, address) VALUES (${row.id}, '${row.adFor}', '${row.siteName}' , '${row.address}' )`;
    return new Promise(function(resolve, reject){
        con.query(query, (err, result) => {
            if(err) reject(err);
            resolve (result)
        })
    })
}

async function dbHandler(jobsArr){
    for(var i = 0; i < jobsArr.length; i++){
        let row = jobsArr[i];
        let flag = await findById(jobsArr[i].id)
            .then((res) => {
                if(res.length === 0) return true;
                return false;
            })
            .catch((err) =>{
                return false;
            })
        if(!flag) return false;
        let addInTableFlag = await addInTable(row)
            .then((res) => {
                return true;
            })
            .catch((err) =>{
                return false;
            })
        if(!addInTableFlag) return false;
    }
    return true;
}

function getData(moreLink) {
    return rp(url+moreLink)
    .then(function(html){
        let jobsArr = [];
        const $ = cheerio.load(html);
        const rows = $('.athing');
        let jobObj = {};
        for(let i=0; i< rows.length; i++){
            jobObj = {};
            const id = rows[i].attribs.id;
            const adFor = $(rows[i]).children('.title').children('a').text();
            const siteName = $(rows[i]).children('.title').children('.sitebit').children('a').children('.sitestr').text();
            const address = $(rows[i]).children('.title').children('.storylink').attr('href');
            jobObj = {
                'id': id,
                'adFor': adFor,
                'siteName': siteName,
                'address': address
            }
            jobsArr.push(jobObj);
        }
        moreLink = $('.morelink').attr('href');
        return {
            'jobsArr': jobsArr,
            'moreLink': moreLink
        };
    })
    .catch(function(err){
        return err;
    })
}

function caller(moreLink){
    getData(moreLink)
    .then((value)=>{
        let { jobsArr, moreLink } = value;
        if(!value || !jobsArr){
            console.log('Something wrong with data');
            console.log(jobsArr);
            return;
        }
        //findbyid and save in db
        dbHandler(jobsArr)
        .then((res) => {
            if(!res) return;
            if(!moreLink){
                console.log('More Link' + moreLink)
                return;
            }
            moreLink = moreLink.split('=')[1];
            return setTimeout(()=>{caller(moreLink)},15000);
        })
    })
}

caller(moreLink);

// for cron job please comment above line and uncomment below lines and set time accordingly 

// new CronJob('0 0 * * *', function() {
//    caller(moreLink);
//}, null, true, 'America/Los_Angeles');