const fetch = require('node-fetch');
const express = require('express')
const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "localhost",
    port: 8889,
    user: "root",
    database: "jira",
    password: "root"
});

const key = 'johnny.aizov@gmail.com:as246wBfHOsKPORfInckC52C'
const url = 'https://aiiia.atlassian.net/'

const app = express()
app.set("view engine", "hbs");


app.get('/a/:filterId', async (req, res) => {

    const filters = new Filters()
    const filtersData = await filters.getAll()
    const issues = new Issues()
    const filter = await filters.getById(req.params.filterId)

    const issuesData = await issues.getIssuesByJql(filter.jql)
    // console.log(issuesData)


    const [usersArr, statusesArr] = await generateTable(issuesData.issues)

    res.render("helloworld", {
        usersArr,
        statusesArr,
        filtersData
    });
});

app.get('/', async function (req, res) {
    const issues = new Issues()
    const filters = new Filters()
    const filtersData = await filters.getAll()
    const issuesData = await issues.getAll()
    try {
        const [usersArr, statusesArr] = await generateTable(issuesData.issues)
        res.render("helloworld", {
            usersArr,
            statusesArr,
            filtersData
        });
        LogToMySQL('ididi', 'GeneratedTable', '1')// true
    } catch (e) {
        LogToMySQL('ididi', 'GeneratedTable', '0')// false
    }



})

function LogToMySQL(userId, action, isOk){
    const date = require('moment')().format('YYYY-MM-DD')
    const time = require('moment')().format('HH:mm:ss')
    const sql =
        "INSERT INTO logs(`userId`, `date`, `time`, `action`, `isOk`)" +
        `VALUES('${userId}', '${date}', '${time}', '${action}', ${isOk})`;

    pool.query(sql, function (err, results) {
        if(err) console.log(err);
        else console.log("Данные добавлены");
    })

}

//
// app.get('/a/:filterId', async function(req, res) {
//     const filters = new Filters()
//     const filtersData = await filters.getAll()
//     const issues = new Issues()
//     console.log('sddsdsds')
//
//     const filter = await filters.getById(req.params.filterId)
//     // console.log(filter)
//     const issuesData = await issues.getIssuesByJql(filter.jql)
//     // console.log(issuesData)
//     const [usersArr, statusesArr] = await generateTable(issuesData.issues)
//
//     res.render("helloworld", {
//         filtersData,
//         statusesArr,
//         usersArr
//     });
//
// });


async function generateTable(issuesData) {
    const users = new Users()
    const usersData = await users.getAll()
    const statuses = new Statuses()
    const statusData = await statuses.getAll()

    const statusesArr = []
    const usersArr = []
    for(let a = 0; a < statusData.length; a++) {
        statusesArr.push([statusData[a]['name']])
    }

    for (let i = 0; i < usersData.length; i++) {
        if (usersData[i]['accountType'] === 'atlassian') {
                usersArr[i] = {
                    ['accountId']: usersData[i]['accountId'],
                    ['displayName']: usersData[i]['displayName'],
                    ['statuses']: [],
                }
                for(let a = 0; a < statusData.length; a++) {
                    usersArr[i]['statuses'].push([statusData[a]['id'], {
                        // name: statusData[a]['name'],
                        amount: 0,
                        ids: []
                    } ])
                    // console.log(usersArr[i])
                }
            // console.log(i, usersData[i])
            issuesData.forEach((issue) => {

                // console.log(i, usersData[i])
                if (issue['fields']['assignee']['accountId'] === usersData[i]['accountId']) {
                    for(let a = 0; a < usersArr[i]['statuses'].length; a++) {
                        if (issue['fields']['status']['id'] === usersArr[i]['statuses'][a][0]) {
                            usersArr[i]['statuses'][a][1]['amount'] += 1

                            usersArr[i]['statuses'][a][1]['ids'].push(issue['id'])
                        }
                    }
                }
            })

        }
    }
    // console.log('TABLE: ', usersArr)

    return [usersArr, statusesArr]

}

app.listen(3000)

class Jira {
    constructor() {
        this.siteUrl = url
        this.apiKey = key
    }
    async get(url) {
        const response = await fetch(this.siteUrl+url, {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${Buffer.from(
                    this.apiKey
                ).toString('base64')}`,
                'Accept': 'application/json'
            }
        })
        let data =  await response.json()
        // console.log(data)
        return data
    }
}
class Filters extends Jira {
    async getAll(){
        const filters = await this.get('rest/api/3/filter/search')
        return filters.values
    }
    getById(id) {
        return this.get('rest/api/3/filter/'+id)
    }
}

class Users extends Jira {
    getAll() {
        return this.get('rest/api/3/users/search')
    }
}
class Statuses extends Jira {
    getAll() {
        return this.get('rest/api/3/status')
    }
}
class Issues extends Jira {
    getAll() {
        return this.get('rest/api/3/search?jql=project=FIR')
    }
    getIssuesByJql(jql){
        return this.get('rest/api/3/search?jql='+jql)
    }
}


