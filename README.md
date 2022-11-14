This repository will contain Student Proposed Project 10's Senior Design Project for Fall 2022.

TO SETUP PRE-COMMIT LINT CHECKS:
1. Go into ".git\hooks" and delete "pre-commit.sample"
2. Open the pre-commit file in your preferred text editor and replace the INDEXJS path on line 9 with a path to your own index.js and index.html
3. Add any additional paths and checks as formatted above, ensuring that you follows the string formatting established in the existing checks.
4. Copy the finished pre-commit file into ".git/hooks"
5. You may now commit to the repository. Files that do not follow the JSLint coding guidelines we have established will cause the commit to fail.