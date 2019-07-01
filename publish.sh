# Build TS
npm install -g typescript
cd ./tasks/test
npm install
tsc 
cd ../install
npm install
tsc
cd ../build
npm install
tsc 
cd ../../

# Create extension
npm i -g tfx-cli
tfx extension create --manifest-globs vss-extension.json

# > Upload from https://marketplace.visualstudio.com/manage/publishers/ic3dbasrops