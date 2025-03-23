import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        avatar: {
            type: String,
            required: true
        },
        coverImage: {
            type: String
        },
        password: {
            type: String,
            required: true,
        },
        totalStorage: {
            type: Number,
            default: 15 * 1024
        },
        usedStorage: {
            type: Number,
            default: 0
        },
        refreshToken: {
            type: String
        },
        resetPasswordToken: {
            type: String,
            select: false 
        },
        resetPasswordExpires: {
            type: Date,
            index: true, 
            select: false
        }
    },
    {
        timestamps: true
    }
);



userSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next(); 

    console.log("Hashing password before saving...");
    this.password = await bcrypt.hash(this.password, 12);
    next();
});


userSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};


// Generate Access Token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};


// Generate Refresh Token
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            iat: Math.floor(Date.now() / 1000) 
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    );
};


// Generate Password Reset Token 
userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");
    this.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    this.resetPasswordExpires = Date.now() + 10 * 60 * 1000; 
    return resetToken; 
};


export const User = mongoose.model("User", userSchema);
