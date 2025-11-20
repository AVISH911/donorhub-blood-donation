// Script to seed blood donation camp data
require('dotenv').config();
const mongoose = require('mongoose');

// Camp Schema
const CampSchema = new mongoose.Schema({
  title: String,
  organizer: String,
  date: Date,
  location: String,
  city: String,
  targetDonors: Number,
  donorsRegistered: { type: Number, default: 0 }
});

const Camp = mongoose.model('Camp', CampSchema);

// Sample camp data
const sampleCamps = [
  {
    title: 'Community Blood Drive 2024',
    organizer: 'Red Cross Mumbai',
    date: new Date('2024-12-20'),
    location: 'Community Center, Andheri',
    city: 'Mumbai',
    targetDonors: 100,
    donorsRegistered: 45
  },
  {
    title: 'Corporate Blood Donation Camp',
    organizer: 'TCS Foundation',
    date: new Date('2024-12-15'),
    location: 'TCS Campus, Whitefield',
    city: 'Bangalore',
    targetDonors: 150,
    donorsRegistered: 78
  },
  {
    title: 'University Health Fair Blood Drive',
    organizer: 'Delhi University Medical Center',
    date: new Date('2024-12-18'),
    location: 'North Campus, Delhi University',
    city: 'Delhi',
    targetDonors: 200,
    donorsRegistered: 120
  },
  {
    title: 'Holiday Season Blood Donation',
    organizer: 'Rotary Club Pune',
    date: new Date('2024-12-22'),
    location: 'Shivaji Nagar Community Hall',
    city: 'Pune',
    targetDonors: 80,
    donorsRegistered: 35
  },
  {
    title: 'New Year Blood Donation Camp',
    organizer: 'Apollo Hospitals',
    date: new Date('2025-01-05'),
    location: 'Apollo Hospital Campus',
    city: 'Chennai',
    targetDonors: 120,
    donorsRegistered: 0
  },
  {
    title: 'Republic Day Blood Drive',
    organizer: 'Lions Club Mumbai',
    date: new Date('2025-01-26'),
    location: 'Bandra Community Center',
    city: 'Mumbai',
    targetDonors: 150,
    donorsRegistered: 0
  },
  {
    title: 'Tech Park Blood Donation Camp',
    organizer: 'Infosys Foundation',
    date: new Date('2025-01-10'),
    location: 'Electronic City Tech Park',
    city: 'Bangalore',
    targetDonors: 180,
    donorsRegistered: 0
  },
  {
    title: 'Winter Blood Donation Drive',
    organizer: 'AIIMS Delhi',
    date: new Date('2025-01-15'),
    location: 'AIIMS Medical Campus',
    city: 'Delhi',
    targetDonors: 250,
    donorsRegistered: 0
  },
  {
    title: 'Pongal Festival Blood Camp',
    organizer: 'Fortis Healthcare Chennai',
    date: new Date('2025-01-14'),
    location: 'Fortis Malar Hospital',
    city: 'Chennai',
    targetDonors: 100,
    donorsRegistered: 0
  },
  {
    title: 'IT Corridor Blood Donation',
    organizer: 'Wipro Cares',
    date: new Date('2025-01-20'),
    location: 'Hinjewadi IT Park',
    city: 'Pune',
    targetDonors: 130,
    donorsRegistered: 0
  }
];

async function seedCamps() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/donorhub');
    console.log('Connected to MongoDB\n');
    
    // Check if camps already exist
    const existingCount = await Camp.countDocuments();
    
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing camps.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Do you want to delete existing data and reseed? (yes/no): ', async (answer) => {
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          await Camp.deleteMany({});
          console.log('Deleted existing camps.\n');
          await insertCamps();
        } else {
          console.log('Keeping existing data. Adding new camps...\n');
          await insertCamps();
        }
        readline.close();
        await mongoose.connection.close();
        process.exit(0);
      });
    } else {
      await insertCamps();
      await mongoose.connection.close();
      process.exit(0);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function insertCamps() {
  try {
    const result = await Camp.insertMany(sampleCamps);
    console.log(`✓ Successfully added ${result.length} blood donation camps:\n`);
    
    result.forEach((camp, index) => {
      console.log(`${index + 1}. ${camp.title}`);
      console.log(`   Organizer: ${camp.organizer}`);
      console.log(`   Date: ${camp.date.toDateString()}`);
      console.log(`   Location: ${camp.location}, ${camp.city}`);
      console.log(`   Target: ${camp.targetDonors} donors | Registered: ${camp.donorsRegistered}`);
      console.log('');
    });
    
    console.log('Blood donation camps seeded successfully!');
  } catch (error) {
    console.error('Error inserting camps:', error.message);
  }
}

seedCamps();
