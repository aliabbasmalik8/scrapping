const cheerio = require("cheerio");
const rp = require('request-promise');
const url = 'https://news.ycombinator.com/jobs?next=';
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
            const ad = $(rows[i]).children('.title').children('a').text();
            const siteName = $(rows[i]).children('.title').children('.sitebit').children('a').children('.sitestr').text();
            const address = $(rows[i]).children('.title').children('.storylink').attr('href');
            jobObj = {
                'id': id,
                'ad': ad,
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
function caller(moreLink, mainJobsArr){
    getData(moreLink)
    .then((value)=>{
        let { jobsArr, moreLink } = value;
        if(jobsArr && moreLink){
            moreLink = moreLink.split('=')[1];
            mainJobsArr = mainJobsArr.concat(jobsArr);
            console.log('...')
            return setTimeout(()=>{caller(moreLink, mainJobsArr)},10000);
        }else{
            // console.log(mainJobsArr);
            return mainJobsArr;
        }
    })
}
let mainJobsArr = [];
let moreLink = '';
caller(moreLink,mainJobsArr)
