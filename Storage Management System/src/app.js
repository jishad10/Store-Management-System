import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "50mb"}))
app.use(express.urlencoded({extended: true, limit: "50mb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import userRouter from './routes/user.routes.js'
import folderRouter from './routes/folder.routes.js'
import itemRouter from './routes/item.routes.js'
import favoriteRouter from './routes/favorite.routes.js'
import activityRouter from './routes/activity.routes.js'



//routes declaration

app.use("/api/v1/users", userRouter)
app.use("/api/v1/folders", folderRouter)
app.use("/api/v1/items", itemRouter)
app.use("/api/v1/favorites", favoriteRouter)
app.use("/api/v1/activities", activityRouter)

// http://localhost:8000/api/v1/activities

export { app }