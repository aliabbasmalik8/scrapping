require('dotenv').config()
const cheerio = require("cheerio");
const rp = require('request-promise');
const mysql = require('mysql');
const CronJob = require('cron').CronJob;
const url = 'https://news.ycombinator.com/jobs?next=';
let moreLink = '';

//set db configuration
var con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'scrap_jobs'
});

con.connect(function(err) {
    if (err) throw err;
    var sql = "CREATE TABLE IF NOT EXISTS jobs (id INT, adfor VARCHAR(1000), sitename VARCHAR(1000) ,address VARCHAR(255))";
    con.query(sql, function (err, result) {
      if (err) throw err;
    });
});

function findByIdQuery(id){
    return `SELECT * FROM jobs  WHERE id = ${id}`;
}

function addInTableQuery(row){
    return `INSERT INTO scrap_jobs.jobs  (id, adfor, sitename, address) VALUES (${row.id}, '${row.adFor}', '${row.siteName}' , '${row.address}' )`;
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
        if(!value || !jobsArr || !moreLink) return;
        moreLink = moreLink.split('=')[1];
        for(var i = 0; i < jobsArr.length; i++){
            let row = jobsArr[i];
            con.query(findByIdQuery(jobsArr[i].id), row, (err, result) => {
                if (err) return;
                if(result.length !== 0) return;
                con.query(addInTableQuery(row), (err, result) => {
                    if(err) return;
                })
            })
        }
        return setTimeout(()=>{caller(moreLink)},10000);
    })
}
caller(moreLink);

// for cron job please comment above line and uncomment below lines and set time accordingly 

// new CronJob('0 0 * * *', function() {
//    caller(moreLink);
//}, null, true, 'America/Los_Angeles');