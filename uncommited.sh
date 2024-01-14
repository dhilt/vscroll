if [[ -z $(git status -s) ]]
then
  echo "Tree is clean"
else
  echo "Please commit changes before running this script"
  exit -1
fi