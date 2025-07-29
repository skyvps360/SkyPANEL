// Simple script to create chat tables
// Run this in your browser console on https://skyvps360.xyz

fetch('/api/admin/create-chat-tables', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Chat tables created:', data);
  alert('Chat tables created successfully!');
})
.catch(error => {
  console.error('Error creating chat tables:', error);
  alert('Error creating chat tables: ' + error.message);
}); 