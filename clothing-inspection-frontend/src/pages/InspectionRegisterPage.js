import React, { useEffect, useState } from 'react';
import InspectionRegister from './InspectionRegister';
import { fetchWithAuth } from '../utils/api';

const InspectionRegisterPage = () => {
  const [companies, setCompanies] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const companies = await fetchWithAuth('/products/companies');
        const products = await fetchWithAuth('/products');
        setCompanies(companies);
        setProducts(products);
      } catch (e) {
        setCompanies([]);
        setProducts([]);
      }
    };
    fetchData();
  }, []);

  return (
    <InspectionRegister
      open={true}
      onClose={() => window.history.back()}
      companies={companies}
      products={products}
    />
  );
};

export default InspectionRegisterPage; 