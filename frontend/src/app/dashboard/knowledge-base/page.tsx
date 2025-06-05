'use client';

export default function KnowledgeBasePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Knowledge Base</h1>
      <p className="text-gray-600 mb-6">
        AI-powered knowledge base for grant applications and guidelines.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Search Documents</h2>
          <p className="text-sm text-gray-600">Find relevant grant guidance and best practices.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Ask Questions</h2>
          <p className="text-sm text-gray-600">Get AI-powered answers from our knowledge base.</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-semibold mb-2">Browse Categories</h2>
          <p className="text-sm text-gray-600">Explore documents by category and topic.</p>
        </div>
      </div>
    </div>
  );
}