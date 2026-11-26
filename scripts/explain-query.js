/**
 * Shows how MongoDB runs the contact list query - with and without its index.
 *
 *   npm run explain
 *
 * IXSCAN = the query used an index (reads only the matching entries)
 * COLLSCAN = no index, MongoDB reads every document in the collection
 */
import { connectDB, disconnectDB } from '../src/config/db.js';
import Contact from '../src/models/Contact.js';
import User from '../src/models/User.js';

/** Finds the stage names in a query plan, e.g. ["LIMIT", "FETCH", "IXSCAN"]. */
function stages(plan) {
  const names = [];
  for (let stage = plan; stage; stage = stage.inputStage ?? stage.inputStages?.[0]) names.push(stage.stage);
  return names.join(' <- ');
}

function report(title, explanation) {
  const { executionStats, queryPlanner } = explanation;
  console.log(`\n${title}`);
  console.log(`  plan:               ${stages(queryPlanner.winningPlan)}`);
  console.log(`  index used:         ${JSON.stringify(queryPlanner.winningPlan).match(/"indexName":"([^"]+)"/)?.[1] ?? 'none'}`);
  console.log(`  documents returned: ${executionStats.nReturned}`);
  console.log(`  documents examined: ${executionStats.totalDocsExamined}`);
  console.log(`  keys examined:      ${executionStats.totalKeysExamined}`);
}

try {
  await connectDB();
  const user = await User.findOne({ role: 'user' });
  if (!user) throw new Error('No user found - run "npm run seed" first');

  const filter = { userId: user._id, isDeleted: false };
  const total = await Contact.countDocuments();
  console.log(`Collection "contacts" has ${total} documents. Query: one user's active contacts, newest first, page 1.`);

  // The real list query (the same shape as GET /api/contacts)
  report(
    '1) With the index { userId, isDeleted, createdAt }:',
    await Contact.find(filter).sort({ createdAt: -1 }).limit(10).explain('executionStats'),
  );

  // The same query with indexes switched off ($natural forces a full collection scan)
  report(
    '2) Forced collection scan (what happens without an index):',
    await Contact.find(filter).sort({ createdAt: -1 }).limit(10).hint({ $natural: 1 }).explain('executionStats'),
  );

  console.log('\nWith the index MongoDB examines only the matching contacts; without it, every document in the collection.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await disconnectDB();
}
