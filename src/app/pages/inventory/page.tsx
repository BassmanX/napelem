import React from 'react';
import Layout from '@/app/components/Layout';
import Inventory from '@/app/components/Inventory';

const InventoryPage: React.FC = () => {
  return (
    <Layout role="raktárvezető">
      <Inventory />
    </Layout>
  );
};

export default InventoryPage;