module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', 'https://backinplaygolfing.com');
  res.setHeader('Cache-Control', 's-maxage=3600');
  return res.status(200).json({ key: process.env.GOOGLE_MAPS_KEY || '' });
};
