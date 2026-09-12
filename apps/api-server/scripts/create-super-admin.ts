import * as readline from 'readline';
import { Writable } from 'stream';
import * as argon2 from 'argon2';
import { isEmail } from 'class-validator';
import { PrismaClient, Role } from 'database';

export async function provisionSuperAdmin(
  emailRaw: string,
  passwordRaw: string,
  passwordConfirm: string,
  prismaClient: PrismaClient
) {
  const email = emailRaw.trim().toLowerCase();

  if (!isEmail(email)) {
    throw new Error('Invalid email format.');
  }

  if (passwordRaw.length < 12) {
    throw new Error('Password must be at least 12 characters long.');
  }

  if (passwordRaw !== passwordConfirm) {
    throw new Error('Passwords do not match.');
  }

  // Check if email already exists
  const existingEmail = await prismaClient.user.findUnique({
    where: { email },
  });

  if (existingEmail) {
    throw new Error(`Email ${email} is already in use.`);
  }

  // Check if any SUPER_ADMIN exists
  const existingSuperAdmin = await prismaClient.user.findFirst({
    where: { role: Role.SUPER_ADMIN },
  });

  if (existingSuperAdmin) {
    throw new Error('A SUPER_ADMIN already exists. Cannot bootstrap another.');
  }

  const passwordHash = await argon2.hash(passwordRaw, { type: argon2.argon2id });

  const newUser = await prismaClient.user.create({
    data: {
      email,
      passwordHash,
      role: Role.SUPER_ADMIN,
      isActive: true,
    },
  });

  return { email: newUser.email };
}

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

function askHiddenQuestion(query: string): Promise<string> {
  return new Promise((resolve) => {
    let isMuted = false;
    const mutableStdout = new Writable({
      write: function (chunk, encoding, callback) {
        if (!isMuted) process.stdout.write(chunk, encoding);
        callback();
      }
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: mutableStdout,
      terminal: true,
    });

    process.stdout.write(query);
    isMuted = true;

    rl.question('', (answer) => {
      isMuted = false;
      console.log();
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  console.log('--- SUPER_ADMIN Provisioning Tool ---');
  
  const email = await askQuestion('Enter SUPER_ADMIN email: ');
  const password = await askHiddenQuestion('Enter password (min 12 chars): ');
  const passwordConfirm = await askHiddenQuestion('Confirm password: ');

  const prisma = new PrismaClient();

  try {
    const result = await provisionSuperAdmin(email, password, passwordConfirm, prisma);
    console.log(`\nSUPER_ADMIN created successfully\nEmail: ${result.email}`);
  } catch (error: any) {
    console.error(`\nProvisioning failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Unexpected failure: ${error.message}`);
    process.exitCode = 1;
  });
}
