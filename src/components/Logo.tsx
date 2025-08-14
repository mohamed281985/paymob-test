
import React from 'react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };
  
  return (
    <Link to="/" className="no-underline">
      <div className={`flex justify-center ${className}`}>
        <h1 className={`font-bold glowing-text ${sizeClasses[size]} tracking-wider`}>
          IMEI<sup className="text-xs align-super">•</sup>
        </h1>
      </div>
    </Link>
  );
};

export default Logo;
