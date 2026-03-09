// Define the absolute path to where Vite serves files or where the app could pick this up,
// or instead just generate code we can paste into the DevTools or run via Playwright.

console.log(`
// Paste this into the browser console to test the 1000+ level directly:
const stamps = {};
// Give user 1050 stamps on a dummy item
stamps['dummy'] = { count: 1050, lastStampedDate: '2020-01-01' };
localStorage.setItem('happy_stamps', JSON.stringify(stamps));
window.location.reload();
`);
