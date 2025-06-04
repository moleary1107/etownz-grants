'use client';

import React from 'react';
import { DocumentUploadInterface } from '../../../components/documents/DocumentUploadInterface';

export default function DocumentsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Management</h1>
        <p className="mt-2 text-gray-600">
          Upload and analyze your grant documents with AI-powered insights
        </p>
      </div>
      
      <DocumentUploadInterface />
    </div>
  );
}