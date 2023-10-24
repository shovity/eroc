echo Setup testing environment...
echo

yarn
docker compose build
docker compose up zookeeper kafka mongodb redis -d

echo
echo Setup testing environment done!
echo Wait a bit for everything to be ready...
echo

sleep 1

docker compose up example
status=$?

echo
echo Clear testing environment...
echo
docker compose down

exit 1
