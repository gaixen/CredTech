
"""

SEC Filing Scraper
@author: AdamGetbags

"""
import requests
import pandas as pd
import os
from dotenv import load_dotenv

user_agent = os.getenv('USER_AGENT')

headers = {'User-Agent': user_agent}

companyTickers = requests.get(
    "https://www.sec.gov/files/company_tickers.json",
    headers=headers
    )

companyData = pd.DataFrame.from_dict(companyTickers.json(),
                                     orient='index')


companyData['cik_str'] = companyData['cik_str'].astype(
                           str).str.zfill(10)

cik = companyData[0:1].cik_str[0]

filingMetadata = requests.get(
    f'https://data.sec.gov/submissions/CIK{cik}.json',
    headers=headers
    )

allForms = pd.DataFrame.from_dict(
             filingMetadata.json()['filings']['recent']
             )

# get company facts data
companyFacts = requests.get(
    f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json',
    headers=headers
    )

# get company concept data
companyConcept = requests.get(
    (
    f'https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}'
     f'/us-gaap/Assets.json'
    ),
    headers=headers
    )

# get all filings data 
assetsData = pd.DataFrame.from_dict((
               companyConcept.json()['units']['USD']))

# get assets from 10Q forms and reset index
assets10Q = assetsData[assetsData.form == '10-Q']
assets10Q = assets10Q.reset_index(drop=True)

assets10Q.head()
