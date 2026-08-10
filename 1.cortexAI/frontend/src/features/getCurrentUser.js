import api from "../../utils/axios";
const getCurrentUser = async (req, res) => {
    try{
        const {data}=await api.get("/api/me")
        console.log(data);
        return data;
    } catch(error){
        if (error.response?.status === 401) {
        console.log("User is not logged in.");
        return null;
    }
    console.error("Error fetching current user:", error);
    return null;
    }
}
export default getCurrentUser