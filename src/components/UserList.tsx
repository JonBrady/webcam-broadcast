import React, { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  online: boolean;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // Placeholder: In a real app, this would fetch users from a server
    const mockUsers: User[] = [
      { id: '1', name: 'User 1', online: true },
      { id: '2', name: 'User 2', online: false },
      { id: '3', name: 'User 3', online: true },
    ];
    setUsers(mockUsers);
  }, []);

  return (
    <div className="user-list">
      <h2>Connected Users</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {users.map(user => (
          <li 
            key={user.id}
            style={{ 
              padding: '8px',
              margin: '4px 0',
              backgroundColor: user.online ? '#e6ffe6' : '#ffe6e6',
              borderRadius: '4px'
            }}
          >
            {user.name} - {user.online ? 'Online' : 'Offline'}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserList; 