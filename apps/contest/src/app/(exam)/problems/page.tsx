'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProblems, type Problem } from '@/lib/api';

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProblems() {
      try {
        const data = await getProblems();
        setProblems(data.problems);
      } catch (err) {
        setError((err as Error).message || 'Failed to load problems');
      } finally {
        setLoading(false);
      }
    }

    fetchProblems();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">題目列表</h1>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="px-6 py-4 border-b border-gray-200">
              <div className="h-5 w-48 bg-gray-200 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        {error}
      </div>
    );
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'solved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            AC
          </span>
        );
      case 'attempted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            已嘗試
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            未作答
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">題目列表</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                題目
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {problems.map((problem, index) => (
              <tr
                key={problem.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500">
                  {index + 1}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <Link
                    href={`/problems/${problem.id}`}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {problem.title}
                  </Link>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  {getStatusBadge(problem.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {problems.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            目前沒有題目
          </div>
        )}
      </div>
    </div>
  );
}
