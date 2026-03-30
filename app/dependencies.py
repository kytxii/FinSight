from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
                                                                            
async def get_db():
    async with AsyncSessionLocal() as session:                               
        yield session