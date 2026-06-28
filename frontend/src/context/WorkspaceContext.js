import { createContext, useContext, useState } from "react";

const Ctx = createContext(null);

export function WorkspaceProvider({ children }) {
  const [selectedRef, setSelectedRef] = useState(null);
  const [filters, setFilters] = useState({ minConviction: 0, types: [], event: "all" });
  const [flyTarget, setFlyTarget] = useState(null);
  return (
    <Ctx.Provider value={{ selectedRef, setSelectedRef, filters, setFilters, flyTarget, setFlyTarget }}>
      {children}
    </Ctx.Provider>
  );
}

export const useWorkspace = () => useContext(Ctx);
