import express from 'express';
const app = express();

app.use("/", express.static(__dirname + '/public'))

app.get("/", (_req, res) => {
    res.sendFile(`${__dirname}/public/index.html`)
})

app.listen(5500, () => {
    console.log("====-====[Listening on port 5500]====-====");
    setTimeout(() => {
        console.log("Visit the site at : http://localhost:5500")
    }, 5000);
})