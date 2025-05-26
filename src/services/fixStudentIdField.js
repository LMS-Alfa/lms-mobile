/**
 * This file fixes the field naming inconsistency between studentid and student_id
 * that was introduced after implementing the schedule screen in the parent panel.
 * 
 * The fix ensures consistent field naming across database queries.
 * 
 * Run this with:
 * node src/services/fixStudentIdField.js
 */

const fs = require('fs');
const path = require('path');

// Path to the service file that needs fixing
const filePath = path.join(__dirname, 'parentSupabaseService.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Fix the inconsistency by replacing student_id with studentid
const updatedContent = content.replace(
  /.eq\('student_id', childId\);/g, 
  ".eq('studentid', childId); // Fixed field name to match database schema"
);

// Write the updated content back to the file
fs.writeFileSync(filePath, updatedContent, 'utf8');

console.log('Fixed studentid/student_id inconsistency in parentSupabaseService.ts');
