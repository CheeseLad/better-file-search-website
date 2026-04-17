import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faDownload } from "@fortawesome/free-solid-svg-icons";

import { BTN_INFO, BTN_PRIMARY } from "./theme";
import { faGitlab } from "@fortawesome/free-brands-svg-icons";
import { useState, useEffect } from "react";

type Build = {
  file_name: string;
  file_path: string;
  version: string;
  commit_id: string;
  file_id: string;
  download_url: string;
  date_created: string;
};

type Branch = {
  folder_id: string;
  name: string;
};

function App() {
  const [results, setResults] = useState<Build[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranchName, setCurrentBranchName] = useState<string>("dev");
  const apiBase = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:5000";

  function handleSwitchBranch(branchName: string) {
    setCurrentBranchName(branchName);
  }

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(
          `${apiBase}/builds?branch=${currentBranchName}`,
        );

        const branchesResponse = await fetch(`${apiBase}/branches`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        setResults(data.builds);

        const branchesData = await branchesResponse.json();
        setBranches(branchesData.branches);
      } catch (error) {
        console.error("Error fetching results:", error);
      }
    };

    fetchResults();
  }, [currentBranchName]);

  return (
    <div className="min-h-screen bg-slate-900 p-2 text-slate-100">
      <h1 className="text-3xl font-bold mb-6 text-center pt-6">
        Better File Search - Downloads
      </h1>

      {branches.length > 0 && (
        <div className="p-6 items-center" data-testid="branch-switcher">
          <form className="flex gap-3 mb-6 flex-col" encType="application/json">
            <label className="text-left font-bold">Current Branch:</label>
            <select
              id="current_branch"
              value={currentBranchName}
              onChange={(event) => {
                handleSwitchBranch(event.target.value);
              }}
              className="flex-1 px-4 py-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:ring focus:ring-blue-500"
            >
              {branches.map((branch) => (
                <option key={branch.folder_id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </form>
        </div>
      )}

      {results.length === 0 ? (
        <div className="text-center text-slate-500 mt-10">
          Loading builds for branch{" "}
          <span className="font-bold">{currentBranchName}</span>...
        </div>
      ) : (
        <div className="m-2">
          <ul
            className="grid grid-cols-3 gap-4 max-h-[70vh] items-start overflow-y-auto"
            data-testid="preview-list"
          >
            {results.map((file, i) => (
              <li
                key={i}
                className="p-4 bg-slate-800 rounded border border-slate-700 mr-4"
              >
                <div className="font-semibold break-all">{file.file_name}</div>
                <div className="text-sm text-slate-400 break-all">
                  {file.file_path}
                </div>

                {file.date_created && (
                  <div className="text-xs text-slate-500 mt-1">
                    <span>
                      Date Created:{" "}
                      {new Date(file.date_created).toLocaleString()}
                    </span>
                    <span className="ml-4">Commit ID: {file.commit_id}</span>
                    <span className="ml-4">Branch: {currentBranchName}</span>
                  </div>
                )}

                <div className="mt-2 flex flex-row space-x-2">
                  <a
                    href={file.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className={`px-3 py-1 ${BTN_PRIMARY} text-sm`}>
                      <FontAwesomeIcon icon={faDownload} /> Download Installer
                    </button>
                  </a>

                  <a
                    href={`https://gitlab.computing.dcu.ie/farrej88/2026-csc1097-farrej88-szydloa2/-/commit/${file.commit_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <button className={`px-3 py-1 ${BTN_INFO} text-sm`}>
                      <FontAwesomeIcon icon={faGitlab} /> View Commit
                      Information
                    </button>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
