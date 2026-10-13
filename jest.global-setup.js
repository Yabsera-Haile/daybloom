// Tests run as if the phone were in New York, a zone with daylight saving, so DST bugs show up
// on every machine (CI runs in UTC, this PC in Johannesburg).
module.exports = () => {
  process.env.TZ = 'America/New_York';
};
