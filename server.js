const fetch = require('node-fetch');
const express = require('express')
const mysql = require("mysql2");
const bodyParser = require("body-parser");

const key = 'johnny.aizov@gmail.com:as246wBfHOsKPORfInckC52C'
const url = 'https://aiiia.atlassian.net/'

const pool = mysql.createPool({
    host: "localhost",
    port: 8889,
    user: "root",
    database: "jira",
    password: "root"
});

const app = express()
app.set("view engine", "hbs");

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

app.listen(3000)




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
        LogToMySQL('ididi', 'GeneratedTableFailed: '+e, '0')
    }
})


app.post('/', function (req, res) {
    LogToMySQL('userid', 'clickToUrl: '+console.log(req.body.url), 1)
});


app.get('/a/:filterId', async (req, res) => {
    const issues = new Issues()
    const filters = new Filters()

    const filtersData = await filters.getAll()
    const filter = await filters.getById(req.params.filterId)

    const issuesData = await issues.getIssuesByJql(filter.jql)

    try {
        const [usersArr, statusesArr] = await generateTable(issuesData.issues)
        LogToMySQL('userid', 'fiterChangeTo: '+ filter.jql, 1)
        res.render("helloworld", {
            usersArr,
            statusesArr,
            filtersData
        });
    } catch (e) {
        LogToMySQL('userid', 'fiterError: '+ e, 0)
    }
});


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
                    amount: 0,
                    ids: []
                } ])
            }
            issuesData.forEach((issue) => {
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
    return [usersArr, statusesArr]
}

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





