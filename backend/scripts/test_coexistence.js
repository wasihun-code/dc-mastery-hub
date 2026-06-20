async function test() {
  console.log('Testing coexistence...');

  // 1. Login (SQLite)
  console.log('1. Logging in (SQLite /auth/login)');
  const loginRes = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'wasihunageru@gmail.com', password: 'waseageru' })
  });
  if (!loginRes.ok) throw new Error('Login failed: ' + await loginRes.text());
  const cookie = loginRes.headers.get('set-cookie');
  console.log('Got cookie:', cookie.split(';')[0]);

  // 2. Fetch tracks (SQLite)
  console.log('2. Fetching tracks (SQLite /api/tracks)');
  const tracksRes = await fetch('http://localhost:3001/api/tracks', {
    headers: { 'Cookie': cookie }
  });
  if (!tracksRes.ok) throw new Error('Tracks failed: ' + await tracksRes.text());
  const tracks = await tracksRes.json();
  console.log('Tracks count:', tracks.length);

  // 3. Fetch courses (Postgres)
  console.log('3. Fetching courses (Postgres /api/courses)');
  const coursesRes = await fetch('http://localhost:3001/api/courses', {
    headers: { 'Cookie': cookie }
  });
  if (!coursesRes.ok) throw new Error('Courses failed: ' + await coursesRes.text());
  const courses = await coursesRes.json();
  console.log('Courses count:', courses.length);

  // 4. Interleaved calls
  console.log('4. Interleaved rapid calls...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(fetch('http://localhost:3001/api/tracks', { headers: { 'Cookie': cookie } }).then(r => r.json()));
    promises.push(fetch('http://localhost:3001/api/courses', { headers: { 'Cookie': cookie } }).then(r => r.json()));
  }
  const results = await Promise.all(promises);
  console.log(`Successfully completed ${results.length} interleaved requests.`);
  
  console.log('ALL COEXISTENCE TESTS PASSED!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
