import React from 'react';
import Layout from '../../../components/Layout';
import Inventory from '../../../components/Inventory';

const InventoryPage: React.FC = () => {
  return (
    <Layout role="raktárvezető">
      <Inventory />
    </Layout>
  );
};

export default InventoryPage;