import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({ children }) => {
  return (
    <div className="bg-imei-dark flex flex-col min-h-0 min-w-0">
      <div
        className="w-full max-w-md mx-auto px-4 py-2 flex flex-col my-8 rounded-2xl shadow-2xl"
        style={{
          marginTop: 32, marginBottom: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.18)'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PageContainer;