
export const TableView = ({ title, text, columns, rows }) => (
  <div className="max-w-screen-xl mx-auto px-4 md:px-8">
      <h3>{title}</h3>
      <table border="1">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((col) => (
                <td key={col}>{row[col]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  
  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-8">
        <div className="items-start justify-between md:flex">
            <div className="max-w-lg">
                <h3 className="text-gray-800 text-xl font-bold sm:text-2xl">
                    All Deliveries
                </h3>
                <p className="text-gray-600 mt-2">
                    Take a look ... modify ,,,, 
                </p>
            </div>
            <div className="mt-3 md:mt-0">
                <a
                    href="javascript:void(0)"
                    className="inline-block px-4 py-2 text-white duration-150 font-medium bg-indigo-600 rounded-lg hover:bg-indigo-500 active:bg-indigo-700 md:text-sm"
                >
                    Add product
                </a>
            </div>
        </div>
        <div className="mt-12 relative h-max overflow-auto">
            <table className="w-full table-auto text-sm text-left">
                <thead className="text-gray-600 font-medium border-b">
                <tr>
                  {columns.map((col) => (
                    <th className="py-3 pr-6" key={col}>{col}</th>
                  ))}
                </tr>
                </thead>
                <tbody className="text-gray-600 divide-y">
                {rows.map((row, i) => (
                  <tr key={i}>
                    {columns.map((col) => (
                      <td className="pr-6 py-4 whitespace-nowrap"key={col}>{row[col]}</td>
                    ))}
                  </tr>
                ))}
                    {
                        tableItems.map((item, idx) => (
                            <tr key={idx}>
                                <td className="pr-6 py-4 whitespace-nowrap">{item.name}</td>
                                <td className="pr-6 py-4 whitespace-nowrap">{item.date}</td>
                                <td className="pr-6 py-4 whitespace-nowrap">
                                    <span className={`px-3 py-2 rounded-full font-semibold text-xs ${item.status == "Active" ? "text-green-600 bg-green-50" : "text-blue-600 bg-blue-50"}`}>
                                        {item.status}
                                    </span>
                                </td>
                                <td className="pr-6 py-4 whitespace-nowrap">{item.plan}</td>
                                <td className="pr-6 py-4 whitespace-nowrap">{item.price}</td>
                                <td className="text-right whitespace-nowrap">
                                    <a href="javascript:void()" className="py-1.5 px-3 text-gray-600 hover:text-gray-500 duration-150 hover:bg-gray-50 border rounded-lg">
                                        Manage
                                    </a>
                                </td>
                            </tr>
                        ))
                    }
                </tbody>
            </table>
        </div>
    </div>
)
}