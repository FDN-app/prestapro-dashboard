import React, { createContext, useContext, useState, ReactNode } from 'react';

type Role = 'admin' | 'cobrador';

interface RoleContextType {
  role: Role;
  setRole: (r: Role) => void;
  isAdmin: boolean;
}

const RoleContext = createContext<RoleContextType>({ role: 'admin', setRole: () => {}, isAdmin: true });

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [role, setRole] = useState<Role>('admin');
  return (
    <RoleContext.Provider value={{ role, setRole, isAdmin: role === 'admin' }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => useContext(RoleContext);
