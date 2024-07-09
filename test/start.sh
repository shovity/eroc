# This test is requried yarn, docker and docker compose

echo Setup testing environment...
echo

yarn add file:..
docker compose build

docker compose up zookeeper -d
docker compose up kafka -d
docker compose up mongodb -d
docker compose up redis -d

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
docker compose down -v

exit $status
