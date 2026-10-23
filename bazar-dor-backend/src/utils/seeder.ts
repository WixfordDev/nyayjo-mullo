import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Service, User } from '../models';

dotenv.config();

// Sample data
const usersData = [
  {
    fullName: 'Testing Admin',
    email: 'admin@gmail.com',
    phoneNumber: '01735566789',
    password: '1qazxsw2',
    role: 'admin',
  },
 
  {
    fullName: 'Testing Client',
    email: 'user@gmail.com',
    phoneNumber: '01734456873',
    password: '$2a$08$XGuVWxMWzFykDBo7p/WD4eJljVPdtnCTEwPJdSKI74Bs2hT0S/30O',
    role: 'user',
    isEmailVerified: true,
  },
];

const serviceData = [
  {
    id: 1,
    name: 'Social Media',
    description: [
      'REQUEST LIKES',
      'REQUEST FOLLOWERS',
      'REQUEST COMMENTS',
      'REQUEST VIEWS',
      'REQUEST SHARING TO STORY',
    ],
    Categories: [
      {
        id: 1,
        name: 'Facebook',
        service: [
          { name: 'Request likes', price: 0.6 },
          { name: 'Request followers', price: 0.6 },
          { name: 'Request comments', price: 0.6 },
          { name: 'Request views', price: 0.6 },
          { name: 'Request sharing to story', price: 0.6 },
        ],
      },
      {
        id: 2,
        name: 'Instagram',
        service: [
          { name: 'Request likes', price: 0.6 },
          { name: 'Request followers', price: 0.6 },
          { name: 'Request comments', price: 0.6 },
          { name: 'Request views', price: 0.6 },
          { name: 'Request sharing to story', price: 0.6 },
        ],
      },
      {
        id: 3,
        name: 'Tiktok',
        service: [
          { name: 'Request likes', price: 0.6 },
          { name: 'Request followers', price: 0.6 },
          { name: 'Request comments', price: 0.6 },
          { name: 'Request views', price: 0.6 },
          { name: 'Request sharing to story', price: 0.6 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Video',
    description: [
      'REQUEST VIEWS',
      'REQUEST LIKES',
      'REQUEST COMMENTS',
      'REQUEST SUBSCRIBERS',
    ],
    Categories: [
      {
        id: 1,
        name: 'Youtube',
        service: [
          { name: 'Request views', price: 0.6 },
          { name: 'Request Likes', price: 0.6 },
          { name: 'Request comments', price: 0.6 },
          { name: 'Request views', price: 0.6 },
          { name: 'Request Subscriber', price: 0.6 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Corporate',
    description: [
      'SIGN UP TO SERVICES',
      'APP DOWNLOADS',
      'GAME DOWNLOADS',
      'REQUEST STREAMING',
    ],
    Categories: [
      {
        id: 1,
        name: 'Corporate',
        service: [
          { name: 'Surveys ', price: 0.6 },
          { name: 'App Downloads', price: 0.6 },
          { name: 'Game Downloads', price: 0.6 },
          { name: 'Request views', price: 0.6 },
          { name: 'Request Streaming', price: 0.6 },
        ],
      },
    ],
  },
];

// Function to drop the entire database
const dropDatabase = async () => {
  try {
    await mongoose.connection.dropDatabase();
    console.log('------------> Database dropped successfully! <------------');
  } catch (err) {
    console.error('Error dropping database:', err);
  }
};

// Function to seed users
const seedUsers = async () => {
  try {
    await User.deleteMany({});
    await User.insertMany(usersData);
    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Error seeding users:', err);
  }
};

const seedSubscriptions = async () => {
  try {
    await Service.deleteMany({});
    await Service.insertMany(serviceData);
    console.log('Services seeded successfully!');
  } catch (err) {
    console.error('Error seeding Services:', err);
  }
};

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URL as string);

// Call seeding functions
const seedDatabase = async () => {
  try {
    await dropDatabase();
    await seedUsers();
    await seedSubscriptions();
    console.log('--------------> Database seeding completed <--------------');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    mongoose.disconnect();
  }
};

// Execute seeding
seedDatabase();
