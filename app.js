require('dotenv').config()
const express=require('express');
const mongoose=require('mongoose');
const PORT=process.env.PORT||5000;


const app=express();
mongoose.connect(process.env.MONGODB_URL)
.then(()=>{console.log("MongoDB connected"),app.listen(PORT,()=>{console.log(`App running on PORT: ${PORT}`)})})
.catch((err)=>console.log(err));