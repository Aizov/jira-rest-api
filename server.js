const fetch = require('node-fetch');
const express = require('express')

const key = 'johnny.aizov@gmail.com:as246wBfHOsKPORfInckC52C'
const url = 'https://aiiia.atlassian.net/'

const app = express()
app.set("view engine", "hbs");


app.get('/', async function (req, res) {
    const issues = new Issues()
    const issuesData = await issues.getAll()
    const table = generateTable(issuesData.issues)
    // res.render("helloworld", {
    //     issuesData
    // });

})

async function generateTable(issuesData) {

    const users = new Users()
    const usersData = await users.getAll()
    const statuses = new Statuses()
    const statusData = await statuses.getAll()

    const statusesArr = []


    const usersArr = []

        for (let i = 0; i < usersData.length; i++) {
            if (usersData[i]['accountType'] === 'atlassian') {
                const allStatuses = {}
                for(let a = 0; a < statusData.length; a++) {
                    allStatuses[statusData[a]['id']] = 0
                }
                console.log(allStatuses)

                usersArr[i] = {
                    ['accountId']: usersData[i]['accountId'],
                    ['displayName']: usersData[i]['displayName'],
                    ['statuses']: allStatuses
                }


                console.log(i, usersArr[i])

                issuesData.forEach((issue) => {

                    // console.log(i, usersData[i])
                    if (issue['fields']['assignee']['accountId'] === usersArr[i]['accountId']) {

                        for(let a = 0; a < statusData.length; a++) {
                            if (issue['fields']['status']['id'] === statusData[a]['id']) {
                                usersArr[i]['statuses'][issue['fields']['status']['id']] += 1
                            }
                        }
                    }
                })

                console.log(usersData)
            }
        }

    console.log('TABLE: ', usersArr)




    return usersArr

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
    getAll(){
        return this.get('rest/api/3/users/search')
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


