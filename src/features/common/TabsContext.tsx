import React, { createContext, useContext } from 'react';

export interface OpenTabOptions {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TabsAPI {
  openTab: (opts: OpenTabOptions) => void;
  closeTab: (key: string) => void;
}

const defaultApi: TabsAPI = {
  openTab: () => {},
  closeTab: () => {},
};

export const TabsContext = createContext<TabsAPI>(defaultApi);

export const useTabs = () => useContext(TabsContext);