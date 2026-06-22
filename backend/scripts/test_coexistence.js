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

  // 2. Fetch tracks (Now Postgres!)
  console.log('2. Fetching tracks (Postgres /api/tracks)');
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

  // 4. Fetch questions (Postgres)
  console.log('4. Fetching questions (Postgres /api/manage/courses/introduction-to-python/questions)');
  const qRes = await fetch('http://localhost:3001/api/manage/courses/introduction-to-python/questions', {
    headers: { 'Cookie': cookie }
  });
  if (!qRes.ok) throw new Error('Questions failed: ' + await qRes.text());
  const qs = await qRes.json();
  console.log('Questions count:', qs.length || 0);

  // 5. Fetch progress (SQLite)
  console.log('5. Fetching progress (SQLite /api/progress/dashboard)');
  const pRes = await fetch('http://localhost:3001/api/progress/dashboard', {
    headers: { 'Cookie': cookie }
  });
  if (!pRes.ok) throw new Error('Progress failed: ' + await pRes.text());
  console.log('Progress data fetched successfully.');

  // 5.5 Fetch content/run-code (Postgres + Python sandbox)
  console.log('5.5. Running dataset challenge code (Postgres /api/content/run-code)');
  const rcRes = await fetch('http://localhost:3001/api/content/run-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
    body: JSON.stringify({ code: 'print("hello from sandbox")', courseSlug: 'introduction-to-python' })
  });
  if (!rcRes.ok) throw new Error('Run code failed: ' + await rcRes.text());
  const rcData = await rcRes.json();
  console.log('Run code result:', rcData.success ? 'Success' : 'Failed');

  // 6. Interleaved calls
  console.log('6. Interleaved rapid calls...');
  const promises = [];
  for (let i = 0; i < 5; i++) {
    promises.push(fetch('http://localhost:3001/api/tracks', { headers: { 'Cookie': cookie } }).then(r => r.json()));
    promises.push(fetch('http://localhost:3001/api/courses', { headers: { 'Cookie': cookie } }).then(r => r.json()));
    promises.push(fetch('http://localhost:3001/api/progress/dashboard', { headers: { 'Cookie': cookie } }).then(r => r.json()));
    promises.push(fetch('http://localhost:3001/api/manage/courses/introduction-to-python/questions', { headers: { 'Cookie': cookie } }).then(r => r.json()));
    promises.push(fetch('http://localhost:3001/api/content/run-code', { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
      body: JSON.stringify({ code: 'print("interleaved ' + i + '")', courseSlug: 'introduction-to-python' })
    }).then(r => r.json()));
  }
  const results = await Promise.all(promises);
  console.log(`Successfully completed ${results.length} interleaved requests.`);
  
  console.log('ALL COEXISTENCE TESTS PASSED!');
}

test().catch(err => {
  console.error(err);
  process.exit(1);
});
