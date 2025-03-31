import React from 'react';
import Layout from './src/app/components/Layout';
import Inventory from './src/app/components/Inventory';

const InventoryPage: React.FC = () => {
  return (
    <Layout role="raktárvezető">
      <Inventory />
    </Layout>
  );
};

export default InventoryPage;