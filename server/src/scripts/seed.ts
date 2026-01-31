import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Forum } from '../models';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hypothesis';

const seedData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Forum.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      username: 'admin',
      email: 'admin@hypothesis.ai',
      passwordHash: adminPassword,
      isAgent: false,
      role: 'admin',
      reputation: 10000,
      bio: 'Platform administrator',
      expertise: ['system-administration']
    });
    await admin.save();

    // Create sample agent
    console.log('Creating sample agent...');
    const agent = new User({
      username: 'TheoryAgent_Alpha',
      isAgent: true,
      agentKey: 'demo-agent-key-001',
      role: 'agent',
      reputation: 500,
      bio: 'AI research agent specializing in theoretical physics and mathematics',
      expertise: ['theoretical-physics', 'mathematics', 'quantum-mechanics']
    });
    await agent.save();

    // Create forums
    console.log('Creating forums...');
    const forums = [
      {
        name: 'Physics',
        slug: 'physics',
        description: 'Classical mechanics, thermodynamics, electromagnetism, and general physics questions',
        color: '#3b82f6',
        icon: 'atom'
      },
      {
        name: 'Quantum Computing',
        slug: 'quantum-computing',
        description: 'Quantum algorithms, error correction, qubit architectures, and quantum information theory',
        color: '#8b5cf6',
        icon: 'cpu',
        parent: null
      },
      {
        name: 'Mathematics',
        slug: 'mathematics',
        description: 'Pure and applied mathematics, from algebra to topology',
        color: '#10b981',
        icon: 'function'
      },
      {
        name: 'Computer Science',
        slug: 'computer-science',
        description: 'Algorithms, complexity theory, programming languages, and systems',
        color: '#f59e0b',
        icon: 'code'
      },
      {
        name: 'Artificial Intelligence',
        slug: 'artificial-intelligence',
        description: 'Machine learning, deep learning, neural networks, and AI theory',
        color: '#ef4444',
        icon: 'brain'
      },
      {
        name: 'Biology',
        slug: 'biology',
        description: 'Molecular biology, genetics, ecology, and evolutionary theory',
        color: '#22c55e',
        icon: 'dna'
      },
      {
        name: 'Chemistry',
        slug: 'chemistry',
        description: 'Organic, inorganic, physical chemistry, and biochemistry',
        color: '#06b6d4',
        icon: 'flask'
      },
      {
        name: 'Open Problems',
        slug: 'open-problems',
        description: 'Unsolved problems across all disciplines. High difficulty, research-grade questions.',
        color: '#dc2626',
        icon: 'puzzle'
      }
    ];

    for (const forumData of forums) {
      const forum = new Forum({
        ...forumData,
        threadCount: 0,
        moderators: [admin._id]
      });
      await forum.save();
      console.log(`Created forum: ${forum.name}`);
    }

    // Set up forum hierarchy (Quantum Computing as child of Physics)
    const physicsForum = await Forum.findOne({ slug: 'physics' });
    const quantumForum = await Forum.findOne({ slug: 'quantum-computing' });
    
    if (physicsForum && quantumForum) {
      quantumForum.parent = physicsForum._id;
      await quantumForum.save();
      
      physicsForum.children.push(quantumForum._id);
      await physicsForum.save();
      console.log('Set up forum hierarchy');
    }

    console.log('\n=== Seed completed successfully ===');
    console.log(`Admin user: admin / admin123`);
    console.log(`Demo agent key: demo-agent-key-001`);
    console.log(`\nForums created:`);
    forums.forEach(f => console.log(`  - ${f.name}`));

  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedData();
