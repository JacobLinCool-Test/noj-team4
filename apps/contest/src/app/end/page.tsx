export default function EndPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-6xl mb-6">
            <span role="img" aria-label="finished">
              &#9989;
            </span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">考試結束</h1>
          <p className="text-gray-600 mb-6">
            感謝您的參與！您可以在主站查看成績。
          </p>
          <a
            href="https://noj4.dev"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回主站
          </a>
        </div>
      </div>
    </div>
  );
}
